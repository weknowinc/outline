// @flow
import * as React from 'react';
import styled, { withTheme } from 'styled-components';
import { SearchIcon } from 'outline-icons';
import Flex from 'shared/components/Flex';

type Props = {
  onChange: string => *,
  theme: Object,
};

class SearchField extends React.Component<Props> {
  input: ?HTMLInputElement;

  handleChange = (ev: SyntheticEvent<*>) => {
    this.props.onChange(ev.currentTarget.value ? ev.currentTarget.value : '');
  };

  focusInput = (ev: SyntheticEvent<*>) => {
    if (this.input) this.input.focus();
  };

  render() {
    return (
      <Field align="center">
        <StyledIcon
          type="Search"
          size={46}
          color={this.props.theme.textTertiary}
          onClick={this.focusInput}
        />
        <StyledInput
          {...this.props}
          ref={ref => (this.input = ref)}
          onChange={this.handleChange}
          spellCheck="false"
          placeholder="search…"
          type="search"
          autoFocus
        />
      </Field>
    );
  }
}

const Field = styled(Flex)`
  position: relative;
  margin-bottom: 8px;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 10px 10px 10px 60px;
  font-size: 36px;
  font-weight: 400;
  outline: none;
  border: 0;
  background: ${props => props.theme.sidebarBackground};
  transition: ${props => props.theme.backgroundTransition};
  border-radius: 4px;

  color: ${props => props.theme.text};

  ::-webkit-search-cancel-button {
    -webkit-appearance: searchfield-cancel-button;
  }
  ::-webkit-input-placeholder {
    color: ${props => props.theme.placeholder};
  }
  :-moz-placeholder {
    color: ${props => props.theme.placeholder};
  }
  ::-moz-placeholder {
    color: ${props => props.theme.placeholder};
  }
  :-ms-input-placeholder {
    color: ${props => props.theme.placeholder};
  }
`;

const StyledIcon = styled(SearchIcon)`
  position: absolute;
  left: 8px;
`;

export default withTheme(SearchField);
