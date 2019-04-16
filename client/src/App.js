import React, { Component } from 'react';
import { Navbar, Nav, Breadcrumb } from 'react-bootstrap';
import { Runs } from './Runs';
import { Upload } from './UploadRun';
import { Run } from './RunDetail';

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
						<Nav.Link href="#home" onClick={this.openRuns}>Runs</Nav.Link>
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
				<div className="content">
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

export default App;
