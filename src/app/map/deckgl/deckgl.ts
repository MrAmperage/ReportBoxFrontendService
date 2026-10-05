import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Deck, MapViewState } from 'deck.gl';
import DeckGlService from '../deckglService/deckglService';

@Component({
  selector: 'DeckGl',
  templateUrl: './deckgl.html',
  styleUrl: './deckgl.css',
  providers: [DeckGlService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DeckGl implements OnInit {
  @Input()
  ViewState!: MapViewState;
  constructor(private DeckGlService: DeckGlService) {}
  @ViewChild('Container', { static: true })
  Container!: ElementRef<HTMLDivElement>;
  Deck!: Deck;

  InitDeckGl() {
    this.Deck = this.DeckGlService.SetDeck(
      new Deck({
        parent: this.Container.nativeElement,
        viewState: this.ViewState,
        controller: true,
      }),
    );
  }
  ngOnInit(): void {
    this.InitDeckGl();
  }
}
