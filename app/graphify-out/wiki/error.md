# error

> God node · 21 connections · [C:\Users\Admin\Desktop\Intern-main\app\liff\tickets\[id]\page.tsx](file:///C:/Users/Admin/Desktop/Intern-main/app/liff/tickets/%5Bid%5D/page.tsx#L106)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as error
    participant P1 as GET()
    participant P2 as POST()
    participant P3 as getDepartmentLabel()
    participant P4 as verifySignature()
    participant P5 as addRecentEvent()
    participant P6 as administrator()
    participant P7 as findDbHeadViaManagers()
    participant P8 as match
    participant P9 as PATCH()
    participant P10 as Boolean()
    participant P11 as handleSubmit()
    participant P12 as calculateRemainingTime()
    participant P13 as generate1DayTrends()
    participant P14 as generate7DayTrends()
    participant P15 as generate30DayTrends()
    participant P16 as generate90DayTrends()
    participant P17 as getDepartmentStatsByRange()
    participant P18 as generate7DayTrendsForDepartment()
    participant P19 as generate30DayTrendsForDepartment()
    participant P20 as checkGroup()
    participant P21 as generateRecommendations()
    participant P22 as requireAdministrator()
    participant P23 as DELETE()
    participant P24 as fetchZoneTree()
    participant P25 as loadUsers()
    participant P26 as loadAllZones()
    participant P27 as handleSearchZone()
    participant P28 as loadLineQuota()
    participant P29 as saveAllChanges()
    participant P30 as async()
    participant P31 as handleDelete()
    participant P32 as loadImportContext()
    participant P33 as loadZones()
    participant P34 as fetchData()
    participant P35 as handleDragEnd()
    participant P36 as loadOnlineStatus()
    participant P37 as handleLogout()
    P0->>+ P1: calls
    P1-->>- P0: return
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
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P9: calls
    P9-->>- P1: return
    P9->>+ P1: calls
    P1-->>- P9: return
    P9->>+ P0: calls
    P0-->>- P9: return
    P9->>+ P3: calls
    P3-->>- P9: return
    P9->>+ P10: calls
    P10-->>- P9: return
    P1->>+ P11: calls
    P11-->>- P1: return
    P1->>+ P6: calls
    P6-->>- P1: return
    P1->>+ P7: calls
    P7-->>- P1: return
    P1->>+ P12: calls
    P12-->>- P1: return
    P1->>+ P13: calls
    P13-->>- P1: return
    P1->>+ P14: calls
    P14-->>- P1: return
    P1->>+ P15: calls
    P15-->>- P1: return
    P1->>+ P16: calls
    P16-->>- P1: return
    P1->>+ P17: calls
    P17-->>- P1: return
    P1->>+ P18: calls
    P18-->>- P1: return
    P1->>+ P19: calls
    P19-->>- P1: return
    P1->>+ P20: calls
    P20-->>- P1: return
    P1->>+ P21: calls
    P21-->>- P1: return
    P1->>+ P22: calls
    P22-->>- P1: return
    P0->>+ P2: calls
    P2-->>- P0: return
    P0->>+ P9: calls
    P9-->>- P0: return
    P0->>+ P11: calls
    P11-->>- P0: return
    P0->>+ P4: calls
    P4-->>- P0: return
    P0->>+ P23: calls
    P23-->>- P0: return
    P0->>+ P24: calls
    P24-->>- P0: return
    P0->>+ P25: calls
    P25-->>- P0: return
    P0->>+ P26: calls
    P26-->>- P0: return
    P0->>+ P27: calls
    P27-->>- P0: return
    P0->>+ P28: calls
    P28-->>- P0: return
    P0->>+ P29: calls
    P29-->>- P0: return
    P0->>+ P30: calls
    P30-->>- P0: return
    P0->>+ P31: calls
    P31-->>- P0: return
    P0->>+ P32: calls
    P32-->>- P0: return
    P0->>+ P33: calls
    P33-->>- P0: return
    P0->>+ P34: calls
    P34-->>- P0: return
    P0->>+ P35: calls
    P35-->>- P0: return
    P0->>+ P36: calls
    P36-->>- P0: return
    P0->>+ P37: calls
    P37-->>- P0: return
```

## Connections by Relation

### calls
- [[GET()]] `INFERRED`
- [[POST()]] `INFERRED`
- [[PATCH()]] `INFERRED`
- [[handleSubmit()]] `EXTRACTED`
- [[verifySignature()]] `INFERRED`
- [[DELETE()]] `INFERRED`
- [[fetchZoneTree()]] `INFERRED`
- [[loadUsers()]] `INFERRED`
- [[loadAllZones()]] `INFERRED`
- [[handleSearchZone()]] `INFERRED`
- [[loadLineQuota()]] `INFERRED`
- [[saveAllChanges()]] `INFERRED`
- [[async()]] `INFERRED`
- [[handleDelete()]] `INFERRED`
- [[loadImportContext()]] `INFERRED`
- [[loadZones()]] `INFERRED`
- [[fetchData()]] `INFERRED`
- [[handleDragEnd()]] `INFERRED`
- [[loadOnlineStatus()]] `INFERRED`
- [[handleLogout()]] `INFERRED`

### contains
- [[page.tsx]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*