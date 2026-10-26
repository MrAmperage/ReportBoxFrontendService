import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule, provideNzIconsPatch } from 'ng-zorro-antd/icon';
import { LockOutline, UserOutline } from '@ant-design/icons-angular/icons';
import LoginBackground from './components/loginBackground/loginBackground';
import ReportBoxIcon from './components/reportBoxIcon/reportBoxIcon';

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
    ReportBoxIcon,
  ],

  providers: [provideNzIconsPatch([UserOutline, LockOutline])],
})
export default class LoginPage {
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

  Submit(): void {
    if (this.Form.invalid) {
      this.Form.markAllAsTouched();
      return;
    }

    console.log(this.Form.getRawValue());
  }

  ForgotPassword(): void {}
}
