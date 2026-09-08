import { Widget } from 'deck.gl';
import DeckGlService from '../../deckglService/deckglService';

export default abstract class BaseWidget extends Widget {
  constructor(private DeckGlService: DeckGlService) {
    super({});
  }
}
