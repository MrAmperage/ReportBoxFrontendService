import { Component } from '@angular/core';
import LoginPage from './auth/loginPage/loginPage';

@Component({
  imports: [LoginPage],
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
