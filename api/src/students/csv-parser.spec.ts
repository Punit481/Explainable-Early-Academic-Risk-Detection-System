import { BadRequestException } from '@nestjs/common';
import { parseStudentCsv } from './csv-parser.js';

describe('parseStudentCsv', () => {
  it('reads ";" files like the UCI dataset, with quoted values', () => {
    const csv = 'name;school;age;G1\n"Asha";"GP";"17";12\n';

    expect(parseStudentCsv(csv)).toEqual([
      { line: 2, name: 'Asha', features: { school: 'GP', age: 17, G1: 12 } },
    ]);
  });

  it('reads "," files and keeps text values as text', () => {
    const csv = 'name,Mjob,absences\nRavi,teacher,4\nMeera,at_home,0\n';

    expect(parseStudentCsv(csv)).toEqual([
      { line: 2, name: 'Ravi', features: { Mjob: 'teacher', absences: 4 } },
      { line: 3, name: 'Meera', features: { Mjob: 'at_home', absences: 0 } },
    ]);
  });

  it('keeps empty values as empty text so ml-service can reject them', () => {
    const csv = 'name,G2\nRavi,\n';

    expect(parseStudentCsv(csv)[0].features).toEqual({ G2: '' });
  });

  it('rejects a file without a name column', () => {
    expect(() => parseStudentCsv('school,age\nGP,17\n')).toThrow(BadRequestException);
  });

  it('rejects a file with only a header', () => {
    expect(() => parseStudentCsv('name,age\n')).toThrow(BadRequestException);
  });
});
