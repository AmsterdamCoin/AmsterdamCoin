import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { FormGroup, FormControl, Validators, FormBuilder, AbstractControl } from '@angular/forms';

import { ApiService } from '../../shared/services/api.service';
import { GlobalService } from '../../shared/services/global.service';
import { ModalService } from '../../shared/services/modal.service';
import { CoinNotationPipe } from '../../shared/pipes/coin-notation.pipe';

import { NgbModal, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { FeeEstimation } from '../../shared/models/fee-estimation';
import { SidechainFeeEstimation } from '../../shared/models/sidechain-fee-estimation';
import { TransactionBuilding } from '../../shared/models/transaction-building';
import { TransactionSending } from '../../shared/models/transaction-sending';
import { WalletInfo } from '../../shared/models/wallet-info';

import { SplitCoins } from '../../shared/models/split-coins';

import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'split-component',
  templateUrl: './split.component.html',
  styleUrls: ['./split.component.css'],
})

export class SplitComponent implements OnInit, OnDestroy {
  constructor(private apiService: ApiService, private globalService: GlobalService, private modalService: NgbModal, private genericModalService: ModalService, public activeModal: NgbActiveModal, private fb: FormBuilder) {
    this.buildSplitForm();
  }

  public splitForm: FormGroup;
  public apiError: string;
  public spendableBalance: number = 0;
  private walletBalanceSubscription: Subscription;
  public estimatedFee: number = 0;
  public totalBalance: number = 0;
  public coinUnit: string;
  public isSending: boolean = false;

  private buildSplitForm(): void {
    this.splitForm = this.fb.group({
      "utxos": ["", Validators.compose([Validators.required, Validators.min(2), Validators.pattern(/^\d+$/)])],
      "amount": ["", Validators.compose([Validators.required, Validators.pattern(/^([0-9]+)?(\.[0-9]{0,8})?$/), Validators.min(0.00001), (control: AbstractControl) => Validators.max((this.spendableBalance - this.estimatedFee)/100000000)(control)])],
      "password": ["", Validators.required]
    });

    this.splitForm.valueChanges.pipe(debounceTime(300))
      .subscribe(data => this.onSendValueChanged(data));
  }

  onSendValueChanged(data?: any) {
    if (!this.splitForm) { return; }
    const form = this.splitForm;
    for (const field in this.splitFormErrors) {
      this.splitFormErrors[field] = '';
      const control = form.get(field);
      if (control && control.dirty && !control.valid) {
        const messages = this.splitValidationMessages[field];
        for (const key in control.errors) {
          this.splitFormErrors[field] += messages[key] + ' ';
        }
      }
    }

    this.apiError = "";
  }

  public getMaxAmount() {

    let maxAmount = this.spendableBalance - (0.01 * 100000000);
    this.splitForm.patchValue({ amount: maxAmount / 100000000 });
  };

  splitFormErrors = {
    'utxos': '',
    'amount': '',
    'password': ''
  };

  splitValidationMessages = {
    'utxos': {
      'required': 'UTXO\'s is required.',
      'min': 'The minimum UTXO\'s is 2',
      'pattern': 'UTXO\'s must be a whole number'
    },
    'amount': {
      'required': 'An amount is required.',
      'pattern': 'Enter a valid transaction amount. Only positive numbers and no more than 8 decimals are allowed.',
      'min': "The amount has to be more or equal to 0.00001 AMS.",
      'max': 'The total transaction amount exceeds your spendable balance.'
    },
    'password': {
      'required': 'Your password is required.'
    }
  };

  private getWalletBalance() {
    let walletInfo = new WalletInfo(this.globalService.getWalletName());
    this.walletBalanceSubscription = this.apiService.getWalletBalance(walletInfo)
      .subscribe(
        response =>  {
          let balanceResponse = response;
          this.totalBalance = balanceResponse.balances[0].amountConfirmed + balanceResponse.balances[0].amountUnconfirmed;
          this.spendableBalance = balanceResponse.balances[0].spendableAmount;
        },
        error => {
          if (error.status === 0) {
            this.cancelSubscriptions();
          } else if (error.status >= 400) {
            if (!error.error.errors[0].message) {
              this.cancelSubscriptions();
              this.startSubscriptions();
            }
          }
        }
      );
  };
  private cancelSubscriptions() {
    if (this.walletBalanceSubscription) {
      this.walletBalanceSubscription.unsubscribe();
    }
  };
  public getMaxBalance() {
    let data = {
      walletName: this.globalService.getWalletName(),
      feeType: "medium"
    }

    let balanceResponse;

    this.apiService.getMaximumBalance(data)
      .subscribe(
        response => {
          balanceResponse = response;
        },
        error => {
          this.apiError = error.error.errors[0].message;
        },
        () => {
          this.splitForm.patchValue({amount: +new CoinNotationPipe().transform(balanceResponse.maxSpendableAmount)});
          this.estimatedFee = balanceResponse.fee;
        }
      );
  };

  private startSubscriptions() {
    this.getWalletBalance();
  }
  ngOnInit() {
    this.startSubscriptions();
    this.coinUnit = this.globalService.getCoinUnit();
  }

  ngOnDestroy() {
    this.cancelSubscriptions();
  };

  public split() {
    this.isSending = true;
    this.sendSplitCoin();
  };

  private sendSplitCoin() {
    let accountName = "account 0";
    let walletName = this.globalService.getWalletName();
    let amount = this.splitForm.get("amount").value;
    let password = this.splitForm.get("password").value;
    let utxos = this.splitForm.get("utxos").value;

    let splitCoins = new SplitCoins(walletName, accountName, password, amount, utxos);

    this.apiService
      .postCoinSplit(splitCoins)
      .subscribe(
        response => {
          this.activeModal.close("Close clicked");
        },
        error => {
          this.isSending = false;
          this.apiError = error.error.errors[0].message;
        }
      );
  }
}
