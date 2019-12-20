import React, { Component } from 'react';
import { Alert, Button, Card, CardColumns, Form, Row, Col, Accordion, Table, Container, ToggleButtonGroup, ToggleButton } from 'react-bootstrap';
import { handleClientAsyncError, handleServerError } from './util';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { ServerError } from './util';

export class GraphViewer extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        // load summary of all runs
        //this.reload();
    }

    render() {

        return (
            <>
                <Container>
                    <Row>
                        <div>Graphing run {} on {}</div>
                    </Row>
                    <Row>
                        <Col></Col>
                        <Col sm="auto"></Col>
                    </Row>
                </Container>
            </>
        );
    }
}

export default GraphViewer;