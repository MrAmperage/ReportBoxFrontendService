import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import DeckGl from './map/deckgl/deckgl';
import TransportWidget from './map/widgets/transportWidget/transportWidget';
import PhysicsWidget from './map/widgets/physicsWidget/physicsWidget';

@Component({
  imports: [RouterOutlet, DeckGl, TransportWidget, PhysicsWidget],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
