# handleSubmit()

> God node · 8 connections · [C:\Users\Admin\Desktop\Intern-main\app\staff\page.tsx](file:///C:/Users/Admin/Desktop/Intern-main/app/staff/page.tsx#L138)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as handleSubmit()
    participant P1 as GET()
    participant P2 as POST()
    participant P3 as error
    participant P4 as getDepartmentLabel()
    participant P5 as verifySignature()
    participant P6 as addRecentEvent()
    participant P7 as administrator()
    participant P8 as findDbHeadViaManagers()
    participant P9 as match
    participant P10 as PATCH()
    participant P11 as DELETE()
    participant P12 as fetchZoneTree()
    participant P13 as loadUsers()
    participant P14 as loadAllZones()
    participant P15 as handleSearchZone()
    participant P16 as loadLineQuota()
    participant P17 as saveAllChanges()
    participant P18 as async()
    participant P19 as handleDelete()
    participant P20 as loadImportContext()
    participant P21 as loadZones()
    participant P22 as fetchData()
    participant P23 as handleDragEnd()
    participant P24 as loadOnlineStatus()
    participant P25 as handleLogout()
    participant P26 as calculateRemainingTime()
    participant P27 as generate1DayTrends()
    participant P28 as generate7DayTrends()
    participant P29 as generate30DayTrends()
    participant P30 as generate90DayTrends()
    participant P31 as getDepartmentStatsByRange()
    participant P32 as generate7DayTrendsForDepartment()
    participant P33 as generate30DayTrendsForDepartment()
    participant P34 as checkGroup()
    participant P35 as generateRecommendations()
    participant P36 as requireAdministrator()
    participant P37 as validatePassword()
    participant P38 as resetForm()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P2->>+ P3: calls
    P3-->>- P2: return
    P2->>+ P4: calls
    P4-->>- P2: return
    P2->>+ P5: calls
    P5-->>- P2: return
    P2->>+ P6: calls
    P6-->>- P2: return
    P2->>+ P7: calls
    P7-->>- P2: return
    P2->>+ P8: calls
    P8-->>- P2: return
    P2->>+ P9: calls
    P9-->>- P2: return
    P1->>+ P3: calls
    P3-->>- P1: return
    P3->>+ P1: calls
    P1-->>- P3: return
    P3->>+ P2: calls
    P2-->>- P3: return
    P3->>+ P10: calls
    P10-->>- P3: return
    P3->>+ P0: calls
    P0-->>- P3: return
    P3->>+ P5: calls
    P5-->>- P3: return
    P3->>+ P11: calls
    P11-->>- P3: return
    P3->>+ P12: calls
    P12-->>- P3: return
    P3->>+ P13: calls
    P13-->>- P3: return
    P3->>+ P14: calls
    P14-->>- P3: return
    P3->>+ P15: calls
    P15-->>- P3: return
    P3->>+ P16: calls
    P16-->>- P3: return
    P3->>+ P17: calls
    P17-->>- P3: return
    P3->>+ P18: calls
    P18-->>- P3: return
    P3->>+ P19: calls
    P19-->>- P3: return
    P3->>+ P20: calls
    P20-->>- P3: return
    P3->>+ P21: calls
    P21-->>- P3: return
    P3->>+ P22: calls
    P22-->>- P3: return
    P3->>+ P23: calls
    P23-->>- P3: return
    P3->>+ P24: calls
    P24-->>- P3: return
    P3->>+ P25: calls
    P25-->>- P3: return
    P1->>+ P10: calls
    P10-->>- P1: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P7: calls
    P7-->>- P1: return
    P1->>+ P8: calls
    P8-->>- P1: return
    P1->>+ P26: calls
    P26-->>- P1: return
    P1->>+ P27: calls
    P27-->>- P1: return
    P1->>+ P28: calls
    P28-->>- P1: return
    P1->>+ P29: calls
    P29-->>- P1: return
    P1->>+ P30: calls
    P30-->>- P1: return
    P1->>+ P31: calls
    P31-->>- P1: return
    P1->>+ P32: calls
    P32-->>- P1: return
    P1->>+ P33: calls
    P33-->>- P1: return
    P1->>+ P34: calls
    P34-->>- P1: return
    P1->>+ P35: calls
    P35-->>- P1: return
    P1->>+ P36: calls
    P36-->>- P1: return
    P0->>+ P3: calls
    P3-->>- P0: return
    P0->>+ P13: calls
    P13-->>- P0: return
    P0->>+ P37: calls
    P37-->>- P0: return
    P0->>+ P38: calls
    P38-->>- P0: return
```

## Connections by Relation

### calls
- [[GET()]] `INFERRED`
- [[error]] `EXTRACTED`
- [[loadUsers()]] `EXTRACTED`
- [[validatePassword()]] `EXTRACTED`
- [[resetForm()]] `EXTRACTED`

### contains
- [[page.tsx]] `EXTRACTED`
- [[page.tsx]] `EXTRACTED`
- [[page.tsx]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*