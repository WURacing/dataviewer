import React, { Component } from 'react';
import { Button, Card, CardColumns } from 'react-bootstrap';
import { handleClientAsyncError, handleServerError } from './util';

export class Runs extends Component {
	constructor(props) {
		super(props);
		this.state = { runs: [] };
		this.deleteRun = this.deleteRun.bind(this);
	}

	componentDidMount() {
		// load summary of all runs
		this.reload();
	}

	reload() {
		fetch(process.env.REACT_APP_API_SERVER + "/api/runs")
			.then(res => res.json())
			.then(handleServerError)
			.then(runs => runs.sort((a, b) => a.date - b.date))
			.then(runs => this.setState({ runs }))
			.catch(handleClientAsyncError);
	}

	deleteRun(id) {
		fetch(process.env.REACT_APP_API_SERVER + "/api/runs/" + id, {
			method: "DELETE"
		})
		.then((resp) => resp.json())
		.then(handleServerError)
		.then((result) => {
			this.setState(state => ({ runs: state.runs.filter(run => run.id !== id)}))
		})
		.catch(handleClientAsyncError);
	}

	render() {
		return (
			<CardColumns>
				{this.state.runs.map((run, index) =>
					<Card key={`run${index}`} style={{ width: '18rem' }}>
						<Card.Body>
							<Card.Title>
								{new Intl.DateTimeFormat("en-US").format(new Date(run.date))} Run {run.runofday}
							</Card.Title>
							<Card.Text>
								{new Intl.DateTimeFormat("en-US", {minute: "numeric", hour: "numeric", second: "numeric"}).format(new Date(run.date))} at {run.location}
							</Card.Text>
							<Button variant="primary" onClick={() => this.props.onOpenRun(run.id)}>View data</Button>
							<Button variant="danger" onClick={() => this.deleteRun(run.id)}>Delete</Button>
						</Card.Body>
					</Card>
				)}
			</CardColumns>
		);
	}
}

export default Runs;