# -*- coding: utf-8 -*-
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Read Excel file
df = pd.read_excel('EMS เรื่องร้องเรียน ปณ.บางนา.xlsx')

print('Total rows:', len(df))
print('Total columns:', len(df.columns))
print('\nColumns:')
for i, col in enumerate(df.columns):
    print(f'{i+1}. {col}')

print('\n' + '='*80)
print('First 10 rows:')
print('='*80)

for i in range(min(10, len(df))):
    print(f'\n--- Row {i+2} (Excel row {i+2}) ---')
    row_dict = df.iloc[i].fillna('').to_dict()
    for k, v in row_dict.items():
        print(f'{k}: {v}')
