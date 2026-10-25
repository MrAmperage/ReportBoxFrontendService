import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import DeckGl from './map/deckgl/deckgl';
import TransportWidget from './map/widgets/transportWidget/transportWidget';
import PhysicsWidget from './map/widgets/physicsWidget/physicsWidget';
import TerrainWidget from './map/widgets/terrainWidget/terrainWidget';
import Shell from './layout/shell/shell';

@Component({
  imports: [Shell, DeckGl, TerrainWidget, TransportWidget, PhysicsWidget],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  MapViewState = {
    longitude: 86.0873,
    latitude: 55.3547,
    zoom: 10,
    pitch: 60,
    bearing: 0,
  };
}
