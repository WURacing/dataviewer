import logo from './logo.svg';
import './App.css';
import RunTable from './Components/RunTable'
function App() {
  return (
    <div className="AppBar">
      <RunTable apiPath = "https://data.washuracing.com/api/v2/testing"></RunTable>     
    </div>
  );
}

export default App;
