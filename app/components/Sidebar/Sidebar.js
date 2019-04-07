// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import { observer, inject } from 'mobx-react';
import { CloseIcon, MenuIcon } from 'outline-icons';
import Fade from 'components/Fade';
import Flex from 'shared/components/Flex';
import UiStore from 'stores/UiStore';

let firstRender = true;

type Props = {
  children: React.Node,
  location: Location,
  ui: UiStore,
};

@observer
class Sidebar extends React.Component<Props> {
  componentWillReceiveProps = (nextProps: Props) => {
    if (this.props.location !== nextProps.location) {
      this.props.ui.hideMobileSidebar();
    }
  };

  toggleSidebar = () => {
    this.props.ui.toggleMobileSidebar();
  };

  render() {
    const { children, ui } = this.props;
    const content = (
      <Container
        editMode={ui.editMode}
        mobileSidebarVisible={ui.mobileSidebarVisible}
        column
      >
        <Toggle
          onClick={this.toggleSidebar}
          mobileSidebarVisible={ui.mobileSidebarVisible}
        >
          {ui.mobileSidebarVisible ? <CloseIcon /> : <MenuIcon />}
        </Toggle>
        {children}
      </Container>
    );

    // Fade in the sidebar on first render after page load
    if (firstRender) {
      firstRender = false;
      return <Fade>{content}</Fade>;
    }

    return content;
  }
}

const Container = styled(Flex)`
  position: fixed;
  top: 0;
  bottom: 0;
  left: ${props => (props.editMode ? `-${props.theme.sidebarWidth}` : 0)};
  width: 100%;
  background: ${props => props.theme.sidebarBackground};
  transition: left 100ms ease-out;
  margin-left: ${props => (props.mobileSidebarVisible ? 0 : '-100%')};
  z-index: 2;

  @media print {
    display: none;
    left: 0;
  }

  &:before,
  &:after {
    content: '';
    background: ${props => props.theme.sidebarBackground};
    position: absolute;
    top: -50vh;
    left: 0;
    width: 100%;
    height: 50vh;
  }

  &:after {
    top: auto;
    bottom: -50vh;
  }

  ${breakpoint('tablet')`
    width: ${props => props.theme.sidebarWidth};
    margin: 0;
  `};
`;

const Toggle = styled.a`
  position: fixed;
  top: 0;
  left: ${props => (props.mobileSidebarVisible ? 'auto' : 0)};
  right: ${props => (props.mobileSidebarVisible ? 0 : 'auto')};
  z-index: 1;
  margin: 12px;

  ${breakpoint('tablet')`
    display: none;
  `};
`;

export default withRouter(inject('ui')(Sidebar));
