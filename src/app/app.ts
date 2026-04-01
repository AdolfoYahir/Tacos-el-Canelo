import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],          
  templateUrl: './app.html',
  styleUrl: './app.css'             
})
export class AppComponent implements OnInit {   

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    const firebaseUser = await this.authService.getRedirectResult();

    if (firebaseUser) {
      console.log('Redirect de Google detectado, usuario:', firebaseUser.uid);
      await this.authService.syncSession();
      
      // Opcional: redirección manual
      // const returnUrl = this.router.routerState.snapshot.root.queryParams['returnUrl'] || '/menu';
      // this.router.navigate([returnUrl]);
    }
  }
}

// Export alias for SSR entry points
export { AppComponent as App };
