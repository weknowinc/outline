// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import Button from 'components/Button';
import Flex from 'shared/components/Flex';
import HelpText from 'components/HelpText';
import Document from 'models/Document';
import DocumentsStore from 'stores/DocumentsStore';
import UiStore from 'stores/UiStore';

type Props = {
  history: Object,
  document: Document,
  documents: DocumentsStore,
  ui: UiStore,
  onSubmit: () => void,
};

@observer
class DocumentDelete extends React.Component<Props> {
  @observable isDeleting: boolean;

  handleSubmit = async (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.isDeleting = true;
    const { collection } = this.props.document;

    try {
      await this.props.document.delete();
      if (this.props.ui.activeDocumentId === this.props.document.id) {
        this.props.history.push(collection.url);
      }
      this.props.onSubmit();
    } catch (err) {
      this.props.ui.showToast(err.message);
    } finally {
      this.isDeleting = false;
    }
  };

  render() {
    const { document } = this.props;

    return (
      <Flex column>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            Are you sure about that? Deleting the{' '}
            <strong>{document.title}</strong> document is permanent, and will
            delete all of its history, and any child documents.
          </HelpText>
          {!document.isDraft &&
            !document.isArchived && (
              <HelpText>
                If you’d like the option of referencing or restoring this
                document in the future, consider archiving it instead.
              </HelpText>
            )}
          <Button type="submit" danger>
            {this.isDeleting ? 'Deleting…' : 'I’m sure – Delete'}
          </Button>
        </form>
      </Flex>
    );
  }
}

export default inject('documents', 'ui')(withRouter(DocumentDelete));
