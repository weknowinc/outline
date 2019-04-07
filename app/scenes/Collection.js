// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Redirect, Link, Switch, Route } from 'react-router-dom';

import styled, { withTheme } from 'styled-components';
import {
  CollectionIcon,
  PrivateCollectionIcon,
  NewDocumentIcon,
  PinIcon,
} from 'outline-icons';
import RichMarkdownEditor from 'rich-markdown-editor';

import { newDocumentUrl, collectionUrl } from 'utils/routeHelpers';
import CollectionsStore from 'stores/CollectionsStore';
import DocumentsStore from 'stores/DocumentsStore';
import UiStore from 'stores/UiStore';
import Collection from 'models/Collection';

import Search from 'scenes/Search';
import CollectionMenu from 'menus/CollectionMenu';
import Actions, { Action, Separator } from 'components/Actions';
import Heading from 'components/Heading';
import CenteredContent from 'components/CenteredContent';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import Mask from 'components/Mask';
import Button from 'components/Button';
import HelpText from 'components/HelpText';
import DocumentList from 'components/DocumentList';
import Subheading from 'components/Subheading';
import PageTitle from 'components/PageTitle';
import Flex from 'shared/components/Flex';
import Modal from 'components/Modal';
import CollectionPermissions from 'scenes/CollectionPermissions';
import Tabs from 'components/Tabs';
import Tab from 'components/Tab';
import PaginatedDocumentList from 'components/PaginatedDocumentList';

type Props = {
  ui: UiStore,
  documents: DocumentsStore,
  collections: CollectionsStore,
  match: Object,
  theme: Object,
};

@observer
class CollectionScene extends React.Component<Props> {
  @observable collection: ?Collection;
  @observable isFetching: boolean = true;
  @observable permissionsModalOpen: boolean = false;
  @observable redirectTo: ?string;

  componentDidMount() {
    this.loadContent(this.props.match.params.id);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.match.params.id !== this.props.match.params.id) {
      this.loadContent(nextProps.match.params.id);
    }
  }

  componentWillUnmount() {
    this.props.ui.clearActiveCollection();
  }

  loadContent = async (id: string) => {
    const collection = await this.props.collections.fetch(id);

    if (collection) {
      this.props.ui.setActiveCollection(collection);
      this.collection = collection;

      await this.props.documents.fetchPinned({
        collection: id,
      });
    }

    this.isFetching = false;
  };

  onNewDocument = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();

    if (this.collection) {
      this.redirectTo = `${this.collection.url}/new`;
    }
  };

  onPermissions = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.permissionsModalOpen = true;
  };

  handlePermissionsModalClose = () => {
    this.permissionsModalOpen = false;
  };

  renderActions() {
    return (
      <Actions align="center" justify="flex-end">
        <Action>
          <CollectionMenu collection={this.collection} />
        </Action>
        <Separator />
        <Action>
          <a onClick={this.onNewDocument}>
            <NewDocumentIcon />
          </a>
        </Action>
      </Actions>
    );
  }

  render() {
    const { documents, theme } = this.props;

    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;
    if (!this.isFetching && !this.collection) return <Search notFound />;

    const pinnedDocuments = this.collection
      ? documents.pinnedInCollection(this.collection.id)
      : [];
    const hasPinnedDocuments = !!pinnedDocuments.length;
    const collection = this.collection;

    return (
      <CenteredContent>
        {collection ? (
          <React.Fragment>
            <PageTitle title={collection.name} />
            {collection.isEmpty ? (
              <Centered column>
                <HelpText>
                  <strong>{collection.name}</strong> doesn’t contain any
                  documents yet.<br />Get started by creating a new one!
                </HelpText>
                <Wrapper>
                  <Link to={newDocumentUrl(collection)}>
                    <Button icon={<NewDocumentIcon color={theme.buttonText} />}>
                      Create a document
                    </Button>
                  </Link>&nbsp;&nbsp;
                  {collection.private && (
                    <Button onClick={this.onPermissions} neutral>
                      Invite people
                    </Button>
                  )}
                </Wrapper>
                <Modal
                  title="Collection permissions"
                  onRequestClose={this.handlePermissionsModalClose}
                  isOpen={this.permissionsModalOpen}
                >
                  <CollectionPermissions
                    collection={this.collection}
                    onSubmit={this.handlePermissionsModalClose}
                  />
                </Modal>
              </Centered>
            ) : (
              <React.Fragment>
                <Heading>
                  {collection.private ? (
                    <PrivateCollectionIcon
                      color={collection.color}
                      size={40}
                      expanded
                    />
                  ) : (
                    <CollectionIcon
                      color={collection.color}
                      size={40}
                      expanded
                    />
                  )}{' '}
                  {collection.name}
                </Heading>

                {collection.description && (
                  <RichMarkdownEditor
                    id={collection.id}
                    key={collection.description}
                    defaultValue={collection.description}
                    theme={theme}
                    readOnly
                  />
                )}

                {hasPinnedDocuments && (
                  <React.Fragment>
                    <Subheading>
                      <TinyPinIcon size={18} /> Pinned
                    </Subheading>
                    <DocumentList documents={pinnedDocuments} />
                  </React.Fragment>
                )}

                <Tabs>
                  <Tab to={collectionUrl(collection.id)} exact>
                    Recently updated
                  </Tab>
                  <Tab to={collectionUrl(collection.id, 'recent')} exact>
                    Recently published
                  </Tab>
                  <Tab to={collectionUrl(collection.id, 'old')} exact>
                    Least recently updated
                  </Tab>
                  <Tab to={collectionUrl(collection.id, 'alphabetical')} exact>
                    A–Z
                  </Tab>
                </Tabs>
                <Switch>
                  <Route path={collectionUrl(collection.id, 'alphabetical')}>
                    <PaginatedDocumentList
                      key="alphabetical"
                      documents={documents.alphabeticalInCollection(
                        collection.id
                      )}
                      fetch={documents.fetchAlphabetical}
                      options={{ collection: collection.id }}
                    />
                  </Route>
                  <Route path={collectionUrl(collection.id, 'old')}>
                    <PaginatedDocumentList
                      key="old"
                      documents={documents.leastRecentlyUpdatedInCollection(
                        collection.id
                      )}
                      fetch={documents.fetchLeastRecentlyUpdated}
                      options={{ collection: collection.id }}
                    />
                  </Route>
                  <Route path={collectionUrl(collection.id, 'recent')}>
                    <PaginatedDocumentList
                      key="recent"
                      documents={documents.recentlyPublishedInCollection(
                        collection.id
                      )}
                      fetch={documents.fetchRecentlyPublished}
                      options={{ collection: collection.id }}
                      showPublished
                    />
                  </Route>
                  <Route path={collectionUrl(collection.id)}>
                    <PaginatedDocumentList
                      documents={documents.recentlyUpdatedInCollection(
                        collection.id
                      )}
                      fetch={documents.fetchRecentlyUpdated}
                      options={{ collection: collection.id }}
                    />
                  </Route>
                </Switch>
              </React.Fragment>
            )}

            {this.renderActions()}
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Heading>
              <Mask height={35} />
            </Heading>
            <ListPlaceholder count={5} />
          </React.Fragment>
        )}
      </CenteredContent>
    );
  }
}

const Centered = styled(Flex)`
  text-align: center;
  margin: 40vh auto 0;
  max-width: 380px;
  transform: translateY(-50%);
`;

const TinyPinIcon = styled(PinIcon)`
  position: relative;
  top: 4px;
  opacity: 0.8;
`;

const Wrapper = styled(Flex)`
  justify-content: center;
  margin: 10px 0;
`;

export default inject('collections', 'documents', 'ui')(
  withTheme(CollectionScene)
);
