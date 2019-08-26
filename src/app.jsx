import React, { Component, Fragment } from 'react';
import { BrowserRouter as Router, Route, Link, Switch, Redirect } from 'react-router-dom'


import { createMuiTheme, withStyles } from '@material-ui/core/styles';
import { ThemeProvider, mergeClasses } from '@material-ui/styles';

import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';

import Upload from './pages/upload';
import Data from './pages/data';
import Telemetry from './pages/telemetry';

import config from './utils/config.json';
import { fontSize } from '@material-ui/system';

const muiTheme = createMuiTheme({
    palette: {
        primary: {
            light: config.theme.accentLight,
            main: config.theme.accent,
            dark: config.theme.accentDark,
            contrastText: config.theme.gray1
        },
        secondary: {
            main: config.theme.gray1
        }
    },
    typography: {
        fontFamily: '"Ubuntu"',
        fontWeightRegular: 300,
        fontWeightBold: 500
    }
});

const styles = theme => ({
    tabLabel: {
        fontSize: '1.4em'
    }
});

class App extends Component {

    constructor(props) {
        super(props);
        this.tabIndex = {
            '/telemetry': 0,
            '/data': 1,
            '/upload': 2
        };
    }

    render() {
        const { classes } = this.props;
        return (
            <ThemeProvider theme={muiTheme}>
                <Router>
                    <Route
                        path='/*'
                        render={({ location }) => {
                            return (
                                <div>

                                    <div>
                                        <AppBar position='static' elevation={0}>
                                            <Tabs centered value={this.tabIndex[location.pathname]}>
                                                <Tab label={<span className={classes.tabLabel}>Telemetry</span>} component={Link} to='/telemetry' />
                                                <Tab label={<span className={classes.tabLabel}>Data</span>} component={Link} to='/data' />
                                                <Tab label={<span className={classes.tabLabel}>Upload</span>} component={Link} to='/upload' />
                                            </Tabs>
                                        </AppBar>
                                        <Switch>
                                            <Route path='/data' render={() => <Data />} />
                                            <Route path='/telemetry' render={() => <Telemetry />} />
                                            <Route path='/upload' render={() => <Upload />} />
                                            <Route exact path='/' render={() => <Redirect to='/data' />} />
                                        </Switch>
                                    </div>

                                </div>
                            );

                            /*
                            (
                                <Fragment>
                                    <AppBar position='static'>
                                        <Tabs value={location.pathname}>
                                            <Tab label='Telemetry' component={Link} to = '/telemetry' />
                                            <Tab label='Data' component={Link} to = '/data' />
                                            <Tab label='Upload' component={Link} to = '/upload' />
                                        </Tabs>
                                    </AppBar>
                                    <Switch>
                                        <Route path='/data' render={<Data />} />
                                        <Route path='/telemetry' render={<Telemetry />} />
                                        <Route path='/upload' render={<Upload />} />
                                        <Route exact path='/' render={<Redirect to='/data' />} />
                                    </Switch>
                                </Fragment>
                            )
                            */
                        }}
                    />
                </Router>
            </ThemeProvider>
        );
    }
}

export default withStyles(styles)(App);