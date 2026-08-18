import './ui/styles.css';
import { Game } from './game/Game';

const container = document.getElementById('game');
if (!container) throw new Error('#game container not found');
new Game(container);
