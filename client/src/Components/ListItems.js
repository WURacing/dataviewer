import React from 'react';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ListSubheader from '@material-ui/core/ListSubheader';
import DashboardIcon from '@material-ui/icons/Dashboard';
import PeopleIcon from '@material-ui/icons/People';


export const mainListItems = (
    <div>
        <ListItem button> 
            <ListItemIcon>
                <DashboardIcon style={{color: 'white'}}/>
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button> 
            <ListItemIcon>
                <PeopleIcon style={{color: 'white'}}/>
            </ListItemIcon>
            <ListItemText primary="People" />
        </ListItem>
    </div>
)