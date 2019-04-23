// @flow
import * as React from 'react';
import { Redirect } from 'react-router-dom';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { MoreIcon } from 'outline-icons';

import { newDocumentUrl } from 'utils/routeHelpers';
import Document from 'models/Document';
import CollectionsStore from 'stores/CollectionsStore';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

type Props = {
  label?: React.Node,
  document: Document,
  collections: CollectionsStore,
};

@observer
class NewChildDocumentMenu extends React.Component<Props> {
  @observable redirectTo: ?string;

  componentDidUpdate() {
    this.redirectTo = undefined;
  }

  handleNewDocument = () => {
    const { document } = this.props;
    this.redirectTo = newDocumentUrl(document.collectionId);
  };

  handleNewChild = () => {
    const { document } = this.props;
    this.redirectTo = newDocumentUrl(document.collectionId, document.id);
  };

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

    const { label, document, collections, ...rest } = this.props;
    const collection = collections.get(document.collectionId);

    return (
      <DropdownMenu label={label || <MoreIcon />} {...rest}>
        <DropdownMenuItem onClick={this.handleNewDocument}>
          <span>
            New document in{' '}
            <strong>{collection ? collection.name : 'collection'}</strong>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={this.handleNewChild}>
          New child document
        </DropdownMenuItem>
      </DropdownMenu>
    );
  }
}

export default inject('collections')(NewChildDocumentMenu);
