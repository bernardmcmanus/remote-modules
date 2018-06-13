import React from 'react';
import { graphql, createFragmentContainer } from 'react-relay';

export default createFragmentContainer(
	() => <div className="dummy-fragment" />,
	graphql`
		fragment Dummy on DummyType {
			bool
		}
	`
);
