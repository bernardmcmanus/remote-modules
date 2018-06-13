import { graphql } from 'react-relay';

export default graphql`
	query relayQuery {
		dummy {
			...Dummy
		}
	}
`;
