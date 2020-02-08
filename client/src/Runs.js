import React, { Component } from 'react';
import { Alert, Button, Card, CardColumns, Form, Row, Col, Accordion, Table, Container, ToggleButtonGroup, ToggleButton } from 'react-bootstrap';
import { handleClientAsyncError, handleServerError } from './util';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { ServerError } from './util';
import SortedTable from './components/SortableTable';

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
		if (text === '') {
			this.setState({
				filter: undefined,
				filteredRuns: this.state.runs
			});
		} else {
			let lowerText = text.toLowerCase();
			let filteredRuns = this.state.runs.filter((run) => {
				return run.runofday.toString().toLowerCase().includes(lowerText) ||
					run.location.toLowerCase().includes(lowerText) ||
					(run.description && run.description.toString().toLowerCase().includes(lowerText)) ||
					(run.type && run.type.toString().toLowerCase().includes(lowerText));
			});
			this.setState({
				filter: text,
				filteredRuns
			});
		}
	}

	getRunColumns() {
		return [
			{
				key: 'no',
				text: '#'
			},
			{
				key: 'time',
				text: 'Time'
			},
			{
				key: 'duration',
				text: 'Duration'
			},
			{
				key: 'type',
				text: 'Type'
			},
			{
				key: 'note',
				text: 'Note'
			},
			{
				key: 'views',
				text: 'Views'
			},
			{
				key: 'actions',
				text: 'Actions'
			}
		]
	}

	getRunRows(runs) {
		return runs.map((run) => {
			return {
				no: run.runofday,
				time: this.formatTime(run.date),
				duration: this.formatDuration(new Date(run.end), new Date(run.date)),
				type: run.type,
				note: run.description,
				views: '-', // TODO Implement View Count
				actions: <>
					<Button variant="primary" onClick={() => this.props.onOpenRun(run.id)}>View <FontAwesomeIcon icon={faArrowRight} /></Button>
					<Button variant="danger" onClick={() => this.deleteRun(run.id)}><FontAwesomeIcon icon={faTrash} /></Button>
				</>
			}
		});
	}

	getRunSortColumns() {
		return [
			{
				key: 'no',
				text: 'Run #',
				fn: (key) => {
					return function (a, b) {
						console.log(key)
						console.log(a[key] < b[key])
						return a[key] - b[key];
					}
				}
			},
			{
				key: 'duration',
				text: 'Duration',
				fn: (key) => {
					return function (a, b) {
						let durA = a[key].slice(0, -1).split('m');
						let durB = b[key].slice(0, -1).split('m');
						if (durA.length > 1) {
							durA = parseInt(durA[0]) * 60 + parseInt(durA[1]);
						} else {
							durA = parseInt(durA[0]);
						}
						if (durB.length > 1) {
							durB = parseInt(durB[0]) * 60 + parseInt(durB[1]);
						} else {
							durB = parseInt(durB[0]);
						}
						return durB - durA;
					}
				}
			},
			{
				key: 'views',
				text: 'Views',
				fn: (key) => {
					return function (a, b) {
						return a[key] - b[key];
					}
				}
			}
		]
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
							<Card.Header as={Row}>
								<Col>
									<Accordion.Toggle as={Button} variant="link" eventKey={`day${dayi}`}>
										{day.dateStr} at {day.runs[0].location}
									</Accordion.Toggle>
								</Col>
								<div>
									<Button variant="primary" onClick={() => this.setDate({ target: { value: day.dateStr } })}>View all of this day's data</Button>
								</div>
							</Card.Header>
							<Accordion.Collapse eventKey={`day${dayi}`}>
								<Card.Body>
									<Container>
										<Row>

										</Row>
									</Container>

									<SortedTable
										columns={this.getRunColumns()}
										rows={this.getRunRows(day.runs)}
										sortColumns={this.getRunSortColumns()}
										small
									/>
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