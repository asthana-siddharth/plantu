import React from 'react';

export const AuthContext = React.createContext({
  state: {},
  dispatch: () => null,
});
