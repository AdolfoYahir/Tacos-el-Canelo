import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-estado',
  imports: [FormsModule],
  templateUrl: './estado.html',
  styleUrl: './estado.css',
})
export class Estado implements OnInit {

  estado = 'Preparando';

  ngOnInit(){

    setTimeout(()=> this.estado='En camino',3000);
    setTimeout(()=> this.estado='Entregado',6000);

  }
}