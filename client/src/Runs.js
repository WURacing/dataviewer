import React, { Component } from 'react';
import { Button, Card, CardColumns } from 'react-bootstrap';

export class Runs extends Component {
	constructor(props) {
		super(props);
		this.state = { runs: [] };
	}

	componentDidMount() {
		// load summary of all runs
		fetch(process.env.REACT_APP_API_SERVER + "/api/runs")
			.then(res => res.json())
			.then(runs => this.setState({ runs }));
	}

	render() {
		return (
			<CardColumns>
				{this.state.runs.map(run =>
					<Card style={{ width: '18rem' }}>
						<Card.Body>
							<Card.Title>
								{new Intl.DateTimeFormat("en-US").format(new Date(run.date))} Run {run.runofday}
							</Card.Title>
							<Card.Text>
								{run.location}
							</Card.Text>
							<Button variant="primary" onClick={() => this.props.onOpenRun(run.id)}>View data</Button>
						</Card.Body>
					</Card>
				)}
			</CardColumns>
		);
	}
}

export default Runs;