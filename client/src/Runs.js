import React, { Component } from 'react';
import { Button, Card, CardColumns } from 'react-bootstrap';

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
			.then(runs => runs.sort((a, b) => a.date > b.date))
			.then(runs => this.setState({ runs }));
	}

	deleteRun(id) {
		fetch(process.env.REACT_APP_API_SERVER + "/api/runs/" + id, {
			method: "DELETE"
		})
		.then(resp => resp.json())
		.then(_ => this.setState(state => {
			state.runs = state.runs.filter(run => run.id !== id)
			return state;
		}))
		.catch(error => {
			alert("Failed to delete run");
		})
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
							<Button variant="danger" onClick={() => this.deleteRun(run.id)}>Delete</Button>
						</Card.Body>
					</Card>
				)}
			</CardColumns>
		);
	}
}

export default Runs;