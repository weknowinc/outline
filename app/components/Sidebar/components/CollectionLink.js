// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import { observable } from 'mobx';
import { CollectionIcon, PrivateCollectionIcon } from 'outline-icons';
import Collection from 'models/Collection';
import Document from 'models/Document';
import CollectionMenu from 'menus/CollectionMenu';
import UiStore from 'stores/UiStore';
import SidebarLink from './SidebarLink';
import DocumentLink from './DocumentLink';
import DropToImport from 'components/DropToImport';
import Flex from 'shared/components/Flex';

type Props = {
  collection: Collection,
  ui: UiStore,
  activeDocument: ?Document,
  prefetchDocument: (id: string) => *,
};

@observer
class CollectionLink extends React.Component<Props> {
  @observable menuOpen = false;

  render() {
    const { collection, activeDocument, prefetchDocument, ui } = this.props;
    const expanded = collection.id === ui.activeCollectionId;

    return (
      <DropToImport
        key={collection.id}
        collectionId={collection.id}
        activeClassName="activeDropZone"
      >
        <SidebarLink
          key={collection.id}
          to={collection.url}
          icon={
            collection.private ? (
              <PrivateCollectionIcon
                expanded={expanded}
                color={collection.color}
              />
            ) : (
              <CollectionIcon expanded={expanded} color={collection.color} />
            )
          }
          iconColor={collection.color}
          expanded={expanded}
          hideDisclosure
          menuOpen={this.menuOpen}
          label={collection.name}
          exact={false}
          menu={
            <CollectionMenu
              collection={collection}
              onOpen={() => (this.menuOpen = true)}
              onClose={() => (this.menuOpen = false)}
            />
          }
        >
          <Flex column>
            {collection.documents.map(document => (
              <DocumentLink
                key={document.id}
                document={document}
                collection={collection}
                activeDocument={activeDocument}
                prefetchDocument={prefetchDocument}
                depth={1.5}
              />
            ))}
          </Flex>
        </SidebarLink>
      </DropToImport>
    );
  }
}

export default CollectionLink;
