import React, { Component } from 'react';
import L from 'leaflet';
import { Map, ImageOverlay, Marker, Popup } from 'react-leaflet';

export const routerOnlineIcon = new L.Icon({
  iconUrl: 'router_online.png',
  iconSize: [16, 16]
})

export const routerOfflineIcon = new L.Icon({
  iconUrl: 'router_offline.png',
  iconSize: [16, 16]
})

var audio = new Audio('beep.mp3');


export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      ip: '',
      markers: [],
      ipRange: '172.21.9.0/22',
      uptime: ''
    }
  }

  componentDidMount() {
    const markers = localStorage.getItem('markers');
    console.log(markers);
    if (markers != null) {
      this.setState({ ...this.state, markers: JSON.parse(markers) });
    }
    
    setInterval(() => {
      fetch(`http://localhost:8080/api/ping?hosts=${this.state.markers.map(marker => marker.ip)}`, {mode: 'cors'})
        .then(response => response.json())
        .then(response => {
          for (const endpoint of response) {
            for (const marker of this.state.markers) {

              if (marker.ip == endpoint.host) {

                if (marker.alive && !endpoint.alive) {
                  audio.play();

                }

                marker.alive = endpoint.alive;
                marker.ping = endpoint.time;
              }
            }
          }

          this.setState(this.state);

        });
    }, 2000);
  }

  scanRange = () => {
    console.log('Scanning range', this.state.ipRange);
    fetch(`http://localhost:8080/api/scan?iprange=${encodeURI(this.state.ipRange)}`, {mode: 'cors'})
      .then(response => response.json())
      .then(response => {
        const markers = [];

        let positionX = 50;

        console.log(response)

        for (const endpoint of response) {
          let exists = false;
          for (const { ip } of this.state.markers) {
            if (ip == endpoint.ip) {
              exists = true;
              break;
            }
          }

          if (exists) { continue; }

          markers.push({ name: endpoint.systemName, ip: endpoint.ip, position: [-5, positionX], alive: false, uptime: endpoint.uptime });

          positionX += 10;
        }

        this.setState({ ...this.state, markers: [...this.state.markers, ...markers ]});
        localStorage.setItem('markers', JSON.stringify([...this.state.markers, ...markers ]));
      });
  }

  addMarker = () => {
    const markers = [
      ...this.state.markers,
      { name: this.state.name, ip: this.state.ip, position: [50, 50], alive: false, uptime: this.state.uptime },
    ];

    this.setState({
      ...this.state,
      markers,
      name: '',
      ip: '',
      uptime: ''
    });

    localStorage.setItem('markers', JSON.stringify(markers));
  };

  updatePosition = (m) => {
    return (e) => {
      m.position[0] = e.target.getLatLng().lat;
      m.position[1] = e.target.getLatLng().lng;
      
      localStorage.setItem('markers', JSON.stringify(this.state.markers));

      this.setState(this.state);
      // const marker = this.refmarker.current;
      // console.log(marker);
    }
  }

  render() {
    return (
      <div>
        <Map center={[67, 150]} zoom={2.5} style={{ width: 1600, height: 900 }} zoomControl={false}>
          <ImageOverlay
            url="2.png"
            bounds={[[0, 0], [300, 300]]}

          />
          {this.state.markers.map((marker, i) => (
            <Marker draggable={true} onDragend={this.updatePosition(marker)} position={marker.position} 
              icon={marker.alive ? routerOnlineIcon : routerOfflineIcon}>
              <Popup>
                Name: {marker.name} <br/>
                IP: <a href={`http://${marker.ip}`} target="_blank">{marker.ip}</a><br/>
                Ping: {marker.ping} <br/>
                UpTime: {marker.uptime} <br />
                <a href="#" onClick={() => {
                  this.state.markers.splice(i, 1);

                  this.setState(this.state);
                  localStorage.setItem('markers', JSON.stringify(this.state.markers));
                }}>Remove</a>
              </Popup>
            </Marker>
          ))}
        </Map>
        <div style={{ float: 'right', position: 'absolute', right: 0, top: 0 }}>
          <input type="text" placeholder="Name" value={this.state.name} onChange={(e) => this.setState({ ...this.state, name: e.target.value })} /><br/>
          <input type="text" placeholder="IP" value={this.state.ip} onChange={(e) => this.setState({ ...this.state, ip: e.target.value })} /><br/>
          <button onClick={this.addMarker}>Add Marker</button>
        
            <br/><br/>
          <input type="text" placeholder="IP Range" value={this.state.ipRange} onChange={(e) => this.setState({ ...this.state, ipRange: e.target.value })} /><br/>
          <button onClick={this.scanRange}>Scan Range</button>
          <br/><br/>
          <button onClick={() => {
            localStorage.removeItem('markers');
            this.setState({...this.state, markers: []}); 
          }}>Clear Local Storage</button>
            
          <br/><br/>
          Database:<br/>
          <input type="text" value={JSON.stringify(this.state.markers)} onChange={(e) => this.setState({ ...this.state, markers: JSON.parse(e.target.value) })} />

        </div>
        
      </div>
    )
  }
}