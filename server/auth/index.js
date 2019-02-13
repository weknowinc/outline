// @flow
import bodyParser from 'koa-bodyparser';
import Koa from 'koa';
import Router from 'koa-router';
import validation from '../middlewares/validation';
import auth from '../middlewares/authentication';
import addMonths from 'date-fns/add_months';
import { Team } from '../models';
import { stripSubdomain } from '../../shared/utils/domains';

import slack from './slack';
import google from './google';

const app = new Koa();
const router = new Router();

router.use('/', slack.routes());
router.use('/', google.routes());

router.get('/redirect', auth(), async ctx => {
  const user = ctx.state.user;

  // transfer access token cookie from root to subdomain
  ctx.cookies.set('accessToken', undefined, {
    httpOnly: true,
    domain: stripSubdomain(ctx.request.hostname),
  });

  ctx.cookies.set('accessToken', user.getJwtToken(), {
    httpOnly: false,
    expires: addMonths(new Date(), 3),
  });

  const team = await Team.findById(user.teamId);
  // ctx.redirect(`${team.url}/dashboard`);
  ctx.redirect(`${team.url}/doc/intro-ho574j74Fk`);
});

app.use(bodyParser());
app.use(validation());
app.use(router.routes());

export default app;
