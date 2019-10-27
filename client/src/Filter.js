import React, { Component } from 'react';
import { Form, Card, Button, Table, CardColumns } from 'react-bootstrap';
import { handleClientAsyncError, handleServerError } from './util';

function filterEqn(filter) {
    return filter.name + " = " + Object.keys(filter.weights).map((vari) =>
        `${filter.weights[vari]} * ${vari}`
    ).join(" + ");
}

export class Filter extends Component {
    state = { loading: false, filter: { name: "", expression: "" } }
    nameRef = React.createRef();
    expressionRef = React.createRef();

    componentDidMount() {
        this.reload();
    }

    reload() {
        fetch(process.env.REACT_APP_API_SERVER + "/api/filters")
            .then(res => res.json())
            .then(handleServerError)
            .then(filters => this.setState({ filters }))
            .catch(handleClientAsyncError);
    }

    handleSubmit(event) {
        event.preventDefault();
        // Update parameters
        this.setState(state => {
            state.loading = true;
            state.filter.name = this.nameRef.current.value;
            return state;
        })
        // Create new filter
        fetch(process.env.REACT_APP_API_SERVER + "/api/filters", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(this.state.filter)
        })
            .then(resp => resp.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                } else {
                    // Reset form and reload display
                    this.reload();
                    this.nameRef.current.value = "";
                    this.setState(state => {
                        state.filter.name = "";
                        state.filter.expression = "";
                        return state;
                    })
                }
            })
            .catch(handleClientAsyncError)
            .finally(_ => {
                this.setState({ loading: false })
            })
    }

    filterNameChange() {
        // Record change in form field value
        this.setState(state => {
            state.filter.name = this.nameRef.current.value;
            return state;
        })
    }

    expressionChange() {
        // Record change in form field value
        this.setState(state => {
            state.filter.expression = this.expressionRef.current.value;
            return state;
        })
    }

    filterList() {
        return Object.keys(this.state.filters).map(filter => {
            return { name: filter, weights: this.state.filters[filter] }
        })
    }

    deleteFilter(filter) {
        fetch(process.env.REACT_APP_API_SERVER + "/api/filters/" + filter.name, {
            method: "DELETE",
        })
            .then(resp => {
                // Reload displayu
                this.reload();
            })
            .catch(handleClientAsyncError)
            .finally(_ => {
                this.setState({ loading: false })
            })
    }

    render() {
        return (
            <div className="filters">
                {this.state.filters &&
                    <>
                        <h1>Filters</h1>
                        <CardColumns>
                        {this.state.filters.map(filter =>
                            <Card style={{ width: '18rem' }}>
                                <Card.Body>
                                    <Card.Title>{filter.name}</Card.Title>
                                    <Card.Text>{filter.name} = {filter.expression}</Card.Text>
                                    <Button variant="danger" onClick={() => this.deleteFilter(filter)}>Delete</Button>
                                </Card.Body>
                            </Card>
                        )}
                        </CardColumns>
                    </>
                }
                <h1>Add New Filter</h1>
                <Form onSubmit={this.handleSubmit.bind(this)}>
                    <Form.Group controlId="name">
                        <h2>Name of Filter</h2>
                        <Form.Control type="text" placeholder="AccelX" required onChange={this.filterNameChange.bind(this)} ref={this.nameRef} />
                    </Form.Group>
                    <Form.Group controlId="expression">
                        <h2>Expression</h2>
                        <Form.Control type="text" placeholder="CGAccelRawX * cos(pi/4) - CGAccelRawY * sin(pi/4)" required onChange={this.expressionChange.bind(this)} ref={this.expressionRef} />
                    </Form.Group>
                    <Button variant="primary" type="submit" disabled={this.state.loading}>
                        Create
					</Button>
                </Form>
            </div>
        )
    }
}

export default Filter;