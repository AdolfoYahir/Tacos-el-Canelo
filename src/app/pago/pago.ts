import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-pago',
  imports: [FormsModule, NgIf],
  templateUrl: './pago.html',
  styleUrl: './pago.css',
})
export class Pago {

  metodo = 'persona';

  pagar(){
    new Audio('assets/coin.mp3').play();
    alert('Pagando... tus tacos están siendo invocados');
  }
}