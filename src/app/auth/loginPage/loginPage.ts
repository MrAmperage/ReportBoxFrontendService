import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule, provideNzIconsPatch } from 'ng-zorro-antd/icon';

import {
  ArrowRightOutline,
  EyeInvisibleOutline,
  EyeOutline,
  LockOutline,
  UserOutline,
} from '@ant-design/icons-angular/icons';

import LoginBackground from './components/loginBackground/loginBackground';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'LoginPage',
  templateUrl: './loginPage.html',
  styleUrl: './loginPage.css',
  changeDetection: ChangeDetectionStrategy.OnPush,

  imports: [
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzCheckboxModule,
    NzButtonModule,
    NzIconModule,
    LoginBackground,
  ],

  providers: [
    provideNzIconsPatch([
      UserOutline,
      LockOutline,
      EyeOutline,
      EyeInvisibleOutline,
      ArrowRightOutline,
    ]),
  ],
})
export default class LoginPage {
  readonly IsPasswordVisible = signal(false);
  readonly IsLoading = signal(false);

  readonly Form = new FormGroup({
    Login: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),

    Password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),

    Remember: new FormControl(true, {
      nonNullable: true,
    }),
  });

  TogglePasswordVisibility(): void {
    this.IsPasswordVisible.update((Value) => !Value);
  }

  Submit(): void {
    if (this.Form.invalid) {
      this.Form.markAllAsTouched();

      return;
    }

    const Credentials = this.Form.getRawValue();

    console.log(Credentials);
  }

  ForgotPassword(): void {}
}
