import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import loginBackground from './components/loginBackground/loginBackground';
@Component({
  selector: 'LoginPage',
  templateUrl: './loginPage.html',
  styleUrl: './loginPage.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, loginBackground],
})
export default class LoginPage {}
