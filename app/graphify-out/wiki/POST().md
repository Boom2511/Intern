# POST()

> God node · 29 connections · [C:\Users\Admin\Desktop\Intern-main\app\api\zones\route.ts](file:///C:/Users/Admin/Desktop/Intern-main/app/api/zones/route.ts#L418)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as POST()
    participant P1 as GET()
    participant P2 as error
    participant P3 as PATCH()
    participant P4 as handleSubmit()
    participant P5 as verifySignature()
    participant P6 as DELETE()
    participant P7 as fetchZoneTree()
    participant P8 as loadUsers()
    participant P9 as loadAllZones()
    participant P10 as handleSearchZone()
    participant P11 as loadLineQuota()
    participant P12 as saveAllChanges()
    participant P13 as async()
    participant P14 as handleDelete()
    participant P15 as loadImportContext()
    participant P16 as loadZones()
    participant P17 as fetchData()
    participant P18 as handleDragEnd()
    participant P19 as loadOnlineStatus()
    participant P20 as handleLogout()
    participant P21 as administrator()
    participant P22 as findDbHeadViaManagers()
    participant P23 as calculateRemainingTime()
    participant P24 as generate1DayTrends()
    participant P25 as generate7DayTrends()
    participant P26 as generate30DayTrends()
    participant P27 as generate90DayTrends()
    participant P28 as getDepartmentStatsByRange()
    participant P29 as generate7DayTrendsForDepartment()
    participant P30 as generate30DayTrendsForDepartment()
    participant P31 as checkGroup()
    participant P32 as generateRecommendations()
    participant P33 as requireAdministrator()
    participant P34 as getDepartmentLabel()
    participant P35 as addRecentEvent()
    participant P36 as match
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P2->>+ P0: calls
    P0-->>- P2: return
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
    P2->>+ P10: calls
    P10-->>- P2: return
    P2->>+ P11: calls
    P11-->>- P2: return
    P2->>+ P12: calls
    P12-->>- P2: return
    P2->>+ P13: calls
    P13-->>- P2: return
    P2->>+ P14: calls
    P14-->>- P2: return
    P2->>+ P15: calls
    P15-->>- P2: return
    P2->>+ P16: calls
    P16-->>- P2: return
    P2->>+ P17: calls
    P17-->>- P2: return
    P2->>+ P18: calls
    P18-->>- P2: return
    P2->>+ P19: calls
    P19-->>- P2: return
    P2->>+ P20: calls
    P20-->>- P2: return
    P1->>+ P3: calls
    P3-->>- P1: return
    P1->>+ P4: calls
    P4-->>- P1: return
    P1->>+ P21: calls
    P21-->>- P1: return
    P1->>+ P22: calls
    P22-->>- P1: return
    P1->>+ P23: calls
    P23-->>- P1: return
    P1->>+ P24: calls
    P24-->>- P1: return
    P1->>+ P25: calls
    P25-->>- P1: return
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
    P0->>+ P2: calls
    P2-->>- P0: return
    P0->>+ P34: calls
    P34-->>- P0: return
    P0->>+ P5: calls
    P5-->>- P0: return
    P0->>+ P35: calls
    P35-->>- P0: return
    P0->>+ P21: calls
    P21-->>- P0: return
    P0->>+ P22: calls
    P22-->>- P0: return
    P0->>+ P36: calls
    P36-->>- P0: return
```

## Connections by Relation

### calls
- [[GET()]] `EXTRACTED`
- [[error]] `INFERRED`
- [[getDepartmentLabel()]] `INFERRED`
- [[verifySignature()]] `EXTRACTED`
- [[addRecentEvent()]] `EXTRACTED`
- [[administrator()]] `EXTRACTED`
- [[findDbHeadViaManagers()]] `INFERRED`
- [[match]] `INFERRED`

### contains
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`
- [[route.ts]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*