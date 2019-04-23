// @flow
import Router from 'koa-router';
import Sequelize from 'sequelize';
import auth from '../middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentShare } from '../presenters';
import { Document, User, Share, Team } from '../models';
import policy from '../policies';

const Op = Sequelize.Op;
const { authorize } = policy;
const router = new Router();

router.post('shares.list', auth(), pagination(), async ctx => {
  let { sort = 'updatedAt', direction } = ctx.body;
  if (direction !== 'ASC') direction = 'DESC';

  const user = ctx.state.user;
  const where = {
    teamId: user.teamId,
    userId: user.id,
    // $FlowFixMe
    revokedAt: { [Op.eq]: null },
  };

  if (user.isAdmin) delete where.userId;

  const collectionIds = await user.collectionIds();
  const shares = await Share.findAll({
    where,
    order: [[sort, direction]],
    include: [
      {
        model: Document,
        required: true,
        as: 'document',
        where: {
          collectionId: collectionIds,
        },
      },
      {
        model: User,
        required: true,
        as: 'user',
      },
    ],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    data: shares.map(presentShare),
  };
});

router.post('shares.create', auth(), async ctx => {
  const { documentId } = ctx.body;
  ctx.assertPresent(documentId, 'documentId is required');

  const user = ctx.state.user;
  const document = await Document.findById(documentId);
  const team = await Team.findById(user.teamId);
  authorize(user, 'share', document);
  authorize(user, 'share', team);

  const [share] = await Share.findOrCreate({
    where: {
      documentId,
      userId: user.id,
      teamId: user.teamId,
      revokedAt: null,
    },
  });

  share.user = user;
  share.document = document;

  ctx.body = {
    data: presentShare(share),
  };
});

router.post('shares.revoke', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertUuid(id, 'id is required');

  const user = ctx.state.user;
  const share = await Share.findById(id);
  authorize(user, 'revoke', share);

  await share.revoke(user.id);

  ctx.body = {
    success: true,
  };
});

export default router;
