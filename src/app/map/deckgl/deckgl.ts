import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Deck } from 'deck.gl';

@Component({
  selector: 'deckgl',
  templateUrl: './deckgl.html',
  styleUrl: './deckgl.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DeckGl implements OnInit {
  @ViewChild('Container', { static: true })
  Container!: ElementRef<HTMLDivElement>;
  Deck!: Deck;

  InitDeckGl() {
    this.Deck = new Deck({ parent: this.Container.nativeElement });
  }
  ngOnInit(): void {
    this.InitDeckGl();
  }
}
