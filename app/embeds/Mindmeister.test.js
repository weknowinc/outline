/* eslint-disable flowtype/require-valid-file-annotation */
import embeds from '.';

const { Mindmeister } = embeds;

describe('Mindmeister', () => {
  const match = Mindmeister.ENABLED[0];
  test('to be enabled on embed link', () => {
    expect(
      'https://www.mindmeister.com/maps/public_map_shell/326377934/paper-digital-or-online-mind-mapping'.match(
        match
      )
    ).toBeTruthy();
  });

  test('to be enabled on public link', () => {
    expect(
      'https://www.mindmeister.com/326377934/paper-digital-or-online-mind-mapping'.match(
        match
      )
    ).toBeTruthy();
  });

  test('to be enabled without www', () => {
    expect(
      'https://mindmeister.com/326377934/paper-digital-or-online-mind-mapping'.match(
        match
      )
    ).toBeTruthy();
  });

  test('to be enabled without slug', () => {
    expect('https://mindmeister.com/326377934'.match(match)).toBeTruthy();
  });

  test('to not be enabled elsewhere', () => {
    expect('https://mindmeister.com'.match(match)).toBe(null);
    expect('https://www.mindmeister.com/pricing'.match(match)).toBe(null);
  });
});
