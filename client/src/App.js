import React, { Component } from 'react';
import { Navbar, Nav, NavDropdown, Form, FormControl, Button, ListGroup, Card, CardColumns, Breadcrumb, Spinner, Table } from 'react-bootstrap';
import './App.css';

class App extends Component {
	constructor(props) {
		super(props);
		this.state = { mode: "runs", runid: 0 }
		// because member functions can't remember who they are
		this.openRun = this.openRun.bind(this);
		this.openRuns = this.openRuns.bind(this);
		this.openUpload = this.openUpload.bind(this);
	}

	render() {
		return (
			<div className="App">
				<Navbar bg="light" expand="lg">
					<Navbar.Brand href="#home">Data Logger</Navbar.Brand>
					<Navbar.Toggle aria-controls="basic-navbar-nav" />
					<Navbar.Collapse id="basic-navbar-nav">
						<Nav className="mr-auto">
						<Nav.Link href="#home"onClick={this.openRuns}>Runs</Nav.Link>
						<Nav.Link onClick={this.openUpload}>Upload</Nav.Link>
					</Nav>
					</Navbar.Collapse>
				</Navbar>
				<Breadcrumb>
					<Breadcrumb.Item href="#" active={this.state.mode === "runs"} onClick={this.openRuns}>Home</Breadcrumb.Item>
					{ this.state.mode === "single" &&
							<Breadcrumb.Item href="#" active>Run {this.runid}</Breadcrumb.Item>
					}
					{ this.state.mode === "upload" &&
							<Breadcrumb.Item href="#" active>Upload</Breadcrumb.Item>
					}
				</Breadcrumb>
				{ this.state.mode === "runs" &&
					<Runs onOpenRun={this.openRun} />
				}
				{ this.state.mode === "upload" &&
					<Upload onOpenRun={this.openRun} />
				}
				{ this.state.mode === "single" &&
					<Run id={this.state.runid} />
				}
			</div>
		);
	}

	// switch to page for specific run
	openRun(id) {
		this.setState({ mode: "single", runid: id});
	}

	// switch to runs page
	openRuns() {
		this.setState({ mode: "runs" });
	}

	// switch to upload page
	openUpload() {
		this.setState({ mode: "upload" });
	}

}

class Runs extends Component {
	constructor(props) {
		super(props);
		this.state = {runs: []};
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

// left pads a string better than left-pad ever did
function leftPad(string, n) {
	while (string.length < n) {
		string = "0" + string;
	}
	return string;
}

// Date -> HH:mm:ss:mill
function timeString(time) {
	let hr = leftPad(time.getHours().toFixed(0), 2);
	let min = leftPad(time.getMinutes().toFixed(0), 2);
	let sec = leftPad(time.getSeconds().toFixed(0), 2);
	let ms = leftPad(time.getMilliseconds().toFixed(0), 4);
	return `${hr}:${min}:${sec}:${ms}`;
}

class Run extends Component {
	constructor(props) {
		super(props);
		this.state = {};
		// download this run's data
		fetch(process.env.REACT_APP_API_SERVER + "/api/runs/" + props.id)
			.then(res => res.json())
			.then(run => this.load(run));
	}
	load(run) {
		// get a set of the variables present in this log
		let variables = new Set();
		for (let measure of run.data) {
			for (let property of Object.keys(measure)) {
				if (property !== "time") {
					variables.add(property);
				}
			}
		}
		// data is unsorted by default
		run.data.sort((one, two) => one.time > two.time);
		// JS sets only have limited utility
		variables = Array.from(variables);
		this.setState({ run, variables });
	}
	render() {
		if (this.state.run) {
		return (
			<div className="run">
				<h1>Variables in this data</h1>
				<CardColumns>
				{this.state.variables.map(vari =>
					<Card style={{ width: '18rem' }}>
						<Card.Body>
							<Card.Title>
									{vari}
							</Card.Title>
							<Card.Link href="#">Plot</Card.Link>
						</Card.Body>
					</Card>
				)}
				</CardColumns>
				<h1>Raw Data</h1>
				<Table striped bordered hover>
					<thead>
						<tr>
							<th>time</th>
							{this.state.variables.map(vari => <th>{vari}</th>)}
						</tr>
					</thead>
					<tbody>
							{this.state.run.data.map(record => {
								let d = new Date(parseInt(record.time));
								return (
								<tr>
									<td>{timeString(d)}</td>
										{this.state.variables.map(vari =>
											<td>{record[vari]}</td>
										)}
								</tr>
								);
							}
					)}
					</tbody>
				</Table>
			</div>
		);
		} else {
			// display an animation while loading
			return (
				<div className="run">
					<Spinner animation="border" role="status" />
				</div>
			);
		}
	}
}

class Upload extends Component {
	constructor(props) {
		super(props);
		this.handleSubmit = this.handleSubmit.bind(this);
		this.fileRef = React.createRef();
		this.noRef = React.createRef();
		this.locationRef = React.createRef();
	}

	render() {
		return (
			<div className="upload">
				<Form onSubmit={this.handleSubmit}>
					<Form.Group controlId="file">
						<Form.Label>Run Log File</Form.Label>
						<Form.Control type="file" required ref={this.fileRef} />
						<Form.Text className="text-muted">
								Files should be generated by canparser version 2 or later.
						</Form.Text>
					</Form.Group>
					<Form.Group controlId="runno">
						<Form.Label>Run Number Of Day</Form.Label>
						<Form.Control type="number" placeholder="1" required ref={this.noRef} />
					</Form.Group>
					<Form.Group controlId="location">
						<Form.Label>Location</Form.Label>
						<Form.Control type="text" placeholder="Race Track" required ref={this.locationRef} />
					</Form.Group>
					<Button variant="primary" type="submit">
							Submit
					</Button>
				</Form>
			</div>
		);
	}

	handleSubmit(event) {
		let file = this.fileRef.current.files[0];
		let formData = new FormData();
		// upload file and other metadata
		formData.append('file', file);
		formData.append('runofday', this.noRef.current.value);
		formData.append('location', this.locationRef.current.value);
		fetch(process.env.REACT_APP_API_SERVER + "/api/runs", {
			method: "POST",
			body: formData
		})
			.then(response => response.json())
		// jump to run page if successful
			.then(success => this.props.onOpenRun(success.id))
		// set an error message on the page if failed
			.catch(error => {
				this.fileRef.setCustomValidity(error);
				event.target.reportValidity();
			});

	}
}

export default App;
