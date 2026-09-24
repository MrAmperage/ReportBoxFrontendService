import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import DeckGl from './map/deckgl/deckgl';
import TransportWidget from './map/widgets/transportWidget/transportWidget';

@Component({
  imports: [RouterOutlet, DeckGl, TransportWidget],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
