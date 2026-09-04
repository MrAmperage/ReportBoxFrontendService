import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'deckgl',
  templateUrl: './deckgl.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DeckGl {}
