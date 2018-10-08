import React, { Component } from 'react';

export interface TSXComponentProps {
	value: string;
}

export interface TSXComponentState {

}

export class Stateful extends Component<TSXComponentProps, TSXComponentState> {
	state: TSXComponentState = {};

	render() {
		const { value } = this.props;
		return (
			<div className="Stateful">
				<span>I was built with TypeScript!</span>
				<span>{value}</span>
			</div>
		);
	}
}

export function Stateless({ value }: TSXComponentProps) {
	return (
		<div className="Stateless">
			<span>I was built with TypeScript!</span>
			<span>{value}</span>
		</div>
	)
}
