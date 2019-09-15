import React, { Component } from 'react';
import { Alert, Button, Card, CardColumns, Form, Row, Col } from 'react-bootstrap';
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

	setDate(e) {
		let start = new Date(e.target.value + " 00:00:00");
		let end = new Date(e.target.value + " 23:59:59");
		this.props.onOpenRun({ start, end });
	}

	render() {
		return (
			<>
			<Alert key={1} variant="primary">
				Update 9/15/19: filters are now any expressible function - not just linear combinations. i.e. you can use sin/cos/sqrt/etc
				as part of the filters now. However, this does mean you need to re-create all your old filters.
			</Alert>
			<Form>
				<Form.Group as={Row} controlId="formDate">
					<Form.Label column sm={5}>View all data for a specific date:</Form.Label>
					<Col sm={7}>
						<Form.Control type="date" placeholder="Date" onChange={e => this.setDate(e)} />
					</Col>
				</Form.Group>
			</Form>
			<CardColumns>
				{this.state.runs.map((run, index) =>
					<Card key={`run${index}`} style={{ width: '18rem' }}>
						<Card.Body>
							<Card.Title>
								{new Intl.DateTimeFormat("en-US").format(new Date(run.date))} Run {run.runofday}
							</Card.Title>
							<Card.Text>
								<p>{new Intl.DateTimeFormat("en-US", {minute: "numeric", hour: "numeric", second: "numeric"}).format(new Date(run.date))} at {run.location}</p>
								{ run.type && <p>{run.type} Run</p>}
								{ run.description && <p>Note: {run.description}</p>}
							</Card.Text>
							<Button variant="primary" onClick={() => this.props.onOpenRun(run.id)}>View data</Button>
							<Button variant="danger" onClick={() => this.deleteRun(run.id)}>Delete</Button>
						</Card.Body>
					</Card>
				)}
			</CardColumns>
			</>
		);
	}
}

export default Runs;