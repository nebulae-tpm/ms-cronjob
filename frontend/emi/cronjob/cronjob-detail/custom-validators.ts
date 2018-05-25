import {
  FormArray,
  FormControl,
  FormGroup,
  ValidationErrors
} from '@angular/forms';
import { parseString } from 'cron-parser';

export class CustomValidators {
  static cronjobFormatValidate(cronjobFormat: FormControl): ValidationErrors {
    try {
      if (!Object.keys(parseString(cronjobFormat.value).errors).length) {
        return null;
      }
      throw 'Invalid CronjobFormat';
    } catch (ex) {
      return {
        cronjobFormatValidate: true
      };
    }
  }

  static bodyFormatValidate(body: FormControl): ValidationErrors {
    const isValid = false;
    if (!body.value) {
      return null;
    }
    try {
      JSON.parse(body.value);
    } catch (e) {
      return {
        bodyFormatValidate: true
      }
    }
    return null;
  }
}
