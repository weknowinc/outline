// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import FilterOptions from './FilterOptions';
import UsersStore from 'stores/UsersStore';

const defaultOption = {
  key: undefined,
  label: 'Any author',
};

type Props = {
  users: UsersStore,
  userId: ?string,
  onSelect: (key: ?string) => void,
};

@observer
class UserFilter extends React.Component<Props> {
  componentDidMount() {
    this.props.users.fetchPage({ limit: 100 });
  }

  render() {
    const { onSelect, userId, users } = this.props;
    const userOptions = users.orderedData.map(user => ({
      key: user.id,
      label: user.name,
    }));

    return (
      <FilterOptions
        options={[defaultOption, ...userOptions]}
        activeKey={userId}
        onSelect={onSelect}
        defaultLabel="Any author"
        selectedPrefix="Author:"
      />
    );
  }
}

export default inject('users')(UserFilter);
