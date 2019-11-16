import React, { Component } from 'react';
import { Alert, Button, Card, CardColumns, Form, Row, Col, Accordion } from 'react-bootstrap';
import { ServerError } from './util';

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

	async reload() {
		fetch(process.env.REACT_APP_API_SERVER + "/api/runs")
			.then(res => res.json())
			.then(runs => runs.sort((a, b) => a.date - b.date))
			.then(runs => this.setState({ runs }))
			.catch(error => this.setState(() => { throw new ServerError("Loading runs failed", error); }));
	}

	deleteRun(id) {
		fetch(process.env.REACT_APP_API_SERVER + "/api/runs/" + id, { method: "DELETE" })
			.then((resp) => resp.json())
			.then((result) => {
				this.setState(state => ({ runs: state.runs.filter(run => run.id !== id) }))
			})
			.catch(error => this.setState(() => { throw new ServerError(`Deleting run ${id} failed`, error); }));
	}

	setDate(e) {
		let start = new Date(e.target.value + " 00:00:00");
		let end = new Date(e.target.value + " 23:59:59");
		this.props.onOpenRun({ start, end });
	}

	formatTime(date) {
		return new Intl.DateTimeFormat("en-US", { minute: "numeric", hour: "numeric", second: "numeric" }).format(new Date(date));
	}

	formatDuration(end, start) {
		let sec = Math.floor((end.getTime() - start.getTime()) / 1000);
		if (sec >= 3600) {
			return `${Math.floor(sec / 3600)}h${Math.floor(sec / 60) % 60}m${sec % 60}s`;
		} else if (sec >= 60) {
			return `${Math.floor(sec / 60)}m${sec % 60}s`;
		} else {
			return `${sec}s`;
		}
	}

	render() {
		let days = [];
		for (let run of this.state.runs) {
			let date = new Date(run.date).toDateString();
			if (days.length === 0 || days[days.length - 1].dateStr !== date) {
				let newDay = { dateStr: date, runs: [run] };
				days.push(newDay);
			} else {
				days[days.length - 1].runs.push(run);
			}
		}
		days.reverse();

		return (
			<>
				<Form>
					<Form.Group as={Row} controlId="formDate">
						<Form.Label column sm={5}>View all data for a specific date:</Form.Label>
						<Col sm={7}>
							<Form.Control type="date" placeholder="Date" onChange={e => this.setDate(e)} />
						</Col>
					</Form.Group>
				</Form>
				<Accordion defaultActiveKey="day0">
					{days.map((day, dayi) =>
						<Card>
							<Card.Header>
								<Accordion.Toggle as={Button} variant="link" eventKey={`day${dayi}`}>
									{day.dateStr} at {day.runs[0].location}
								</Accordion.Toggle>
							</Card.Header>
							<Accordion.Collapse eventKey={`day${dayi}`}>
								<Card.Body>
									<Button variant="primary" onClick={() => this.setDate({target:{value:day.dateStr}})}>View all of this day's data</Button>
									<CardColumns>
										{day.runs.map((run, runi) =>
											<Card key={`day${dayi}run${runi}`} style={{ width: '18rem' }}>
												<Card.Body>
													<Card.Title>
														{new Intl.DateTimeFormat("en-US").format(new Date(run.date))} Run {run.runofday}
													</Card.Title>
													<Card.Text>
														<p>{this.formatTime(run.date)} at {run.location}, {this.formatDuration(new Date(run.end), new Date(run.date))}</p>
														{run.type && <p>{run.type} Run</p>}
														{run.description && <p>Note: {run.description}</p>}
													</Card.Text>
													<Button variant="primary" onClick={() => this.props.onOpenRun(run.id)}>View data</Button>
													<Button variant="danger" onClick={() => this.deleteRun(run.id)}>Delete</Button>
												</Card.Body>
											</Card>
										)}
									</CardColumns>

								</Card.Body>
							</Accordion.Collapse>
						</Card>
					)}
				</Accordion>
			</>
		);
	}
}

export default Runs;