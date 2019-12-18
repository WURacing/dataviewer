import React, { Component } from 'react';
import { Form, Card, Button, Table, CardColumns } from 'react-bootstrap';
import { ServerError } from './util';
import { create, all } from 'mathjs'
import MathJax from "react-mathjax";
const math = create(all);


function filterEqn(filter) {
    return filter.name + " = " + Object.keys(filter.weights).map((vari) =>
        `${filter.weights[vari]} * ${vari}`
    ).join(" + ");
}

export class Filter extends Component {
    state = { mode: 0, loading: false, filter: { name: "", expression: "" } }
    nameRef = React.createRef();
    expressionRef = React.createRef();
    descriptionRef = React.createRef();
    unitsRef = React.createRef();

    componentDidMount() {
        this.reload().catch(error => this.setState(() => { throw new ServerError("Loading filters failed", error); }));
    }

    async reload() {
        let res = await fetch(process.env.REACT_APP_API_SERVER + "/api/filters");
        let filters = await res.json();
        res = await fetch(process.env.REACT_APP_API_SERVER + "/api/variables");
        let variables = await res.json();
        this.setState({ filters, variables });
    }

    clearForm() {
        this.nameRef.current.value = "";
        this.expressionRef.current.value = "";
        this.descriptionRef.current.value = "";
        this.unitsRef.current.value = "";
        this.setState(state => {
            state.mode = 0;
            state.filter = {};
            return state;
        });
    }

    async handleSubmit(event) {
        // event.preventDefault();
        // Update parameters
        this.setState(state => {
            state.loading = true;
            state.filter.name = this.nameRef.current.value;
            return state;
        });

        if (this.state.mode === 0) {
            // Create new filter
            let resp = await fetch(process.env.REACT_APP_API_SERVER + "/api/filters", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(this.state.filter)
            });
            let data = await resp.json();
            if (data.error) {
                alert(data.error);
            } else {
                // Reset form and reload display
                this.reload();
                this.clearForm();
            }
            this.setState({ loading: false });
        } else if (this.state.mode === 1) {
            // Edit filter
            let resp = await fetch(process.env.REACT_APP_API_SERVER + "/api/filters/" + this.state.filter.name, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(this.state.filter)
            });
            let data = await resp.json();
            if (data.error) {
                alert(data.error);
            } else {
                // Reset form and reload display
                this.reload();
                this.clearForm();
            }
            this.setState({ loading: false });
        } else if (this.state.mode === 2) {
            // Edit variable
            let resp = await fetch(process.env.REACT_APP_API_SERVER + "/api/variables/" + this.state.filter.name, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(this.state.filter)
            });
            let data = await resp.json();
            if (data.error) {
                alert(data.error);
            } else {
                // Reset form and reload display
                this.reload();
                this.clearForm();
            }
            this.setState({ loading: false });
        }
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

    descriptionChange() {
        this.setState(state => {
            state.filter.description = this.descriptionRef.current.value;
            return state;
        });
    }

    unitsChange() {
        this.setState(state => {
            state.filter.units = this.unitsRef.current.value;
            return state;
        });
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
			.catch(error => this.setState(() => { throw new ServerError(`Deleting filter ${filter.name} failed`, error); }))
            .finally(_ => {
                this.setState({ loading: false })
            })
    }

    editFilter(filter) {
        this.nameRef.current.value = filter.name;
        this.expressionRef.current.value = filter.expression;
        this.descriptionRef.current.value = filter.description;
        this.unitsRef.current.value = filter.units;
        this.setState({ mode: 1, filter: filter });
        window.scrollTo(0, 0);
    }

    editVariable(variable) {
        this.nameRef.current.value = variable.name;
        this.expressionRef.current.value = "";
        this.descriptionRef.current.value = variable.description;
        this.unitsRef.current.value = variable.units;
        this.setState({ mode: 2, filter: variable });
        window.scrollTo(0, 0);
    }

    formulaValid(expression) {
        try {
            math.parse(expression);
        } catch (error) {
            return false;
        }
        return true;
    }

    render() {
        return (
            <div className="filters">
                {this.state.mode === 0 && <h1>Add New Filter</h1>}
                {this.state.mode === 1 && <h1>Edit Filter</h1>}
                {this.state.mode === 2 && <h1>Edit Variable</h1>}
                <Form onSubmit={(event) => { event.preventDefault(); this.handleSubmit(event); }}>
                    <Form.Group controlId="name">
                        <h2>Name of Filter</h2>
                        <Form.Control
                            type="text"
                            placeholder="AccelX"
                            required
                            readOnly={this.state.mode > 0}
                            onChange={() => this.filterNameChange()}
                            ref={this.nameRef} />
                    </Form.Group>
                    <Form.Group controlId="expression">
                        <h2>Expression</h2>
                        <Form.Control
                            type="text"
                            placeholder={this.state.mode === 2 ? "" : "CGAccelRawX * cos(pi/4) - CGAccelRawY * sin(pi/4)"}
                            required={this.state.mode < 2}
                            disabled={this.state.mode === 2}
                            onChange={() => this.expressionChange()}
                            ref={this.expressionRef} />
                    </Form.Group>
                    <Form.Group controlId="description">
                        <h2>Description</h2>
                        <Form.Control
                            type="text"
                            placeholder="Gets X acceleration in the car's reference frame"
                            onChange={() => this.descriptionChange()}
                            ref={this.descriptionRef} />
                    </Form.Group>
                    <Form.Group controlId="units">
                        <h2>Units</h2>
                        <Form.Control
                            type="text"
                            placeholder="g"
                            onChange={() => this.unitsChange()}
                            ref={this.unitsRef} />
                    </Form.Group>
                    <Button variant="primary"
                        type="submit" disabled={this.state.loading}>
                        {this.state.mode === 0 && "Create"}
                        {this.state.mode > 0 && "Save"}
					</Button>
                    <Button variant="warning"
                        onClick={() => this.clearForm()} disabled={this.state.loading}>
                        Clear
					</Button>
                </Form>
                {this.state.filters &&
                    <>
                        <h1>Filters</h1>
                        <MathJax.Provider>
                        {this.state.filters.map(filter =>
                            <Card style={{ width: '100%' }}>
                                <Card.Body>
                                    <Card.Title>{filter.name}{filter.units && ` (${filter.units})`}</Card.Title>
                                    <p>{filter.description}</p>
                                    {this.formulaValid(filter.expression) &&
                                        <MathJax.Node formula={math.parse(filter.expression).toTex()} />
                                        ||
                                        <p>INVALID FORMULA! {filter.expression}</p>
                                    }
                                    <Button variant="danger" onClick={() => this.deleteFilter(filter)}>Delete</Button>
                                    <Button variant="primary" onClick={() => this.editFilter(filter)}>Edit</Button>
                                </Card.Body>
                            </Card>
                        )}
                        </MathJax.Provider>
                    </>
                }
                {this.state.variables &&
                    <>
                        <h1>Variables</h1>
                        <CardColumns>
                            {this.state.variables.map(variable =>
                                <Card style={{ width: '100%' }}>
                                    <Card.Body>
                                        <Card.Title>{variable.name}{variable.units && ` (${variable.units})`}</Card.Title>
                                        <p>{variable.description}</p>
                                        <Button variant="primary" onClick={() => this.editVariable(variable)}>Edit</Button>
                                    </Card.Body>
                                </Card>                        
                            )}
                        </CardColumns>
                    </>
                }
            </div>
        )
    }
}

export default Filter;