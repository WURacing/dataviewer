import React, { Component } from 'react';
import { Button, Modal } from 'react-bootstrap';
import './Chart.css';


export class DialogModal extends Component {
	render() {
		return (
			<Modal show={true} onHide={this.props.onClose} size="lg">
				<Modal.Header closeButton={this.props.onClose != null}>
					<Modal.Title>{this.props.title}</Modal.Title>
				</Modal.Header>

				<Modal.Body>
                    <p>{this.props.message}</p>
				</Modal.Body>

				<Modal.Footer>
					{!!this.props.onClose && <Button variant="secondary" onClick={_ => this.props.onClose(false)}>Close</Button>}
				</Modal.Footer>
			</Modal>
		);
	}
}

export default DialogModal;
