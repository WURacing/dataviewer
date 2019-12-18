import React, { Component } from 'react';
import { Navbar, Nav, Breadcrumb } from 'react-bootstrap';
import { Runs } from './Runs';
import { Upload } from './UploadRun';
import { Run } from './RunDetail';
import { Filter } from './Filter';
import { Telemetry } from './Telemetry';
import { ErrorBoundary } from './Error';

import './App.css';

class App extends Component {
	constructor(props) {
		super(props);
		this.state = { mode: "runs", runid: 0 }
		// because member functions can't remember who they are
		this.openRun = this.openRun.bind(this);
		this.openRuns = this.openRuns.bind(this);
		this.openUpload = this.openUpload.bind(this);
		this.openFilters = this.openFilters.bind(this);
		this.openTelemetry = this.openTelemetry.bind(this);
	}

	render() {
		return (
			<div className="App">
				<Navbar bg="light" expand="lg">
					<Navbar.Brand href="#home">
						<img
							alt=""
							src="./logo.svg"
							width="50"
							height="30"
							className="d-inline-block align-top"
						/>{' '}
						Data Logger
					</Navbar.Brand>
					<Navbar.Toggle aria-controls="basic-navbar-nav" />
					<Navbar.Collapse id="basic-navbar-nav">
						<Nav className="mr-auto">
							<Nav.Link href="#home" onClick={this.openRuns}>Runs</Nav.Link>
							<Nav.Link onClick={this.openUpload}>Upload</Nav.Link>
							<Nav.Link onClick={this.openFilters}>Filters & Variables</Nav.Link>
							<Nav.Link onClick={this.openTelemetry}>Telemetry</Nav.Link>
						</Nav>
					</Navbar.Collapse>
				</Navbar>
				<Breadcrumb>
					<Breadcrumb.Item href="#" active={this.state.mode === "runs"} onClick={this.openRuns}>Home</Breadcrumb.Item>
					{this.state.mode === "single" &&
						<Breadcrumb.Item href="#" active>Run {this.runid}</Breadcrumb.Item>
					}
					{this.state.mode === "upload" &&
						<Breadcrumb.Item href="#" active>Upload</Breadcrumb.Item>
					}
					{this.state.mode === "filters" &&
						<Breadcrumb.Item href="#" active>Filters</Breadcrumb.Item>
					}
					{this.state.mode === "telemetry" &&
						<Breadcrumb.Item href="#" active>Telemetry</Breadcrumb.Item>
					}
				</Breadcrumb>
				<div className="content">
				<ErrorBoundary>
				{ this.state.mode === "runs" &&
					<Runs onOpenRun={this.openRun} />
				}
				{ this.state.mode === "upload" &&
					<Upload onOpenRun={this.openRun} />
				}
				{ this.state.mode === "single" &&
					<Run id={this.state.runid} />
				}
				{ this.state.mode === "filters" &&
					<Filter />
				}
				{ this.state.mode === "telemetry" &&
					<Telemetry />
				}
				</ErrorBoundary>
				</div>
			</div>
		);
	}

	// switch to page for specific run
	openRun(id) {
		this.setState({ mode: "single", runid: id });
	}

	// switch to runs page
	openRuns() {
		this.setState({ mode: "runs" });
	}

	// switch to upload page
	openUpload() {
		this.setState({ mode: "upload" });
	}

	// switch to filters page
	openFilters() {
		this.setState({ mode: "filters" });
	}

	// switch to telemetry page
	openTelemetry() {
		this.setState({ mode: "telemetry" });
	}

}

export default App;
