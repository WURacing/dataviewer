import React, { Component } from 'react';
import { Alert, Button, Card, CardColumns, Form, Row, Col, Accordion, Table, Container, ToggleButtonGroup, ToggleButton } from 'react-bootstrap';
import { handleClientAsyncError, handleServerError } from './util';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { ServerError } from './util';

export class Runs extends Component {
	constructor(props) {
		super(props);
		this.state = { runs: [], sort: 'run', filter: undefined, filteredRuns: [] };
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
			.then(runs => this.setState({ runs, filteredRuns: runs }))
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

	changeSort(val) {
		this.setState({ sort: val });
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

	setFilter(e) {
		let text = e.target.value;
		if (text == '') {
			this.setState({
				filter: undefined,
				filteredRuns: this.state.runs
			});
		} else {
			let filteredRuns = this.state.runs.filter((run) => {
				return run.runofday.toString().includes(text) ||
					run.location.includes(text) ||
					(run.description && run.description.toString().includes(text)) ||
					(run.type && run.type.toString().includes(text));
			});
			this.setState({
				filter: text,
				filteredRuns
			});
		}
	}

	sortRuns(a, b) {
		if (this.state.sort == 'run') {
			return a < b
		} else {
			return ((new Date(b.end)).getTime() - (new Date(b.date)).getTime()) - ((new Date(a.end)).getTime() - (new Date(a.date)).getTime());
		}
	}

	render() {
		let days = [];
		for (let run of this.state.filteredRuns) {
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
				<Form>
					<Form.Group as={Row} controlId="formDate">
						<Form.Label column sm={5}>Filter Runs (Run Number, Location, Type, Note):</Form.Label>
						<Col sm={7}>
							<Form.Control type="text" placeholder="Acceleration" onChange={e => this.setFilter(e)} />
						</Col>
					</Form.Group>
				</Form>
				<Accordion defaultActiveKey="day0">
					{days.map((day, dayi) =>
						<Card key={`day${dayi}`}>
							<Card.Header>
								<Accordion.Toggle as={Button} variant="link" eventKey={`day${dayi}`}>
									{day.dateStr} at {day.runs[0].location}
								</Accordion.Toggle>
							</Card.Header>
							<Accordion.Collapse eventKey={`day${dayi}`}>
								<Card.Body>
									<Container>
										<Row>
											<Col>
												<Button variant="primary" onClick={() => this.setDate({ target: { value: day.dateStr } })}>View all of this day's data</Button>
											</Col>
											<Col sm={{ span: 8 }}>
												<span>Sort By:  </span>
												<ToggleButtonGroup type="radio" name="sort" value={this.state.sort} onChange={this.changeSort.bind(this)}>
													<ToggleButton value="run">
														Run #
												</ToggleButton>
													<ToggleButton value="duration">
														Duration
												</ToggleButton>
												</ToggleButtonGroup>
											</Col>
										</Row>
									</Container>

									<Table striped size="sm" hover>
										<thead>
											<tr>
												<th>#</th>
												<th>Time</th>
												<th>Duration</th>
												<th>Type</th>
												<th>Note</th>
												<th>Actions</th>
											</tr>
										</thead>
										<tbody>
											{day.runs.sort(this.sortRuns.bind(this)).map((run, runi) =>
												<tr key={`day${dayi}run${runi}`}>
													<td>{run.runofday}</td>
													<td>{this.formatTime(run.date)}</td>
													<td>{this.formatDuration(new Date(run.end), new Date(run.date))}</td>
													<td>{run.type}</td>
													<td>{run.description}</td>
													<td>
														<Button variant="primary" onClick={() => this.props.onOpenRun(run.id)}>View <FontAwesomeIcon icon={faArrowRight} /></Button>
														<Button variant="danger" onClick={() => this.deleteRun(run.id)}><FontAwesomeIcon icon={faTrash} /></Button>
													</td>
												</tr>
											)}
										</tbody>
									</Table>

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