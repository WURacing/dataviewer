import logo from './logo.svg';
import './App.css';
// import RunTable from './Components/RunTable'
// function App() {
//   return (
//     <div className="AppBar">
//       <RunTable apiPath = "https://data.washuracing.com/api/v2/testing"></RunTable>     
//     </div>
//   );
// }

import React from 'react';
import CssBaseline from '@material-ui/core/CssBaseline';
import Typography from '@material-ui/core/Typography';
import Container from '@material-ui/core/Container';

export default function FixedContainer() {
  return (
    <React.Fragment>
      <CssBaseline />
      <Container fixed>
        <Typography component="div" style={{ backgroundColor: '#cfe8fc', height: '100vh' }} />
      </Container>
    </React.Fragment>
  );
}

export default App;
